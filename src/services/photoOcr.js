// ═══════════════════════════════════════════════════
//  photoOcr — 拍照识题共享工具
//  压缩图片 → 云端识图（智谱 GLM-4V），失败自动压小重试一次
//  供 WorkspacePage（几何搜题）与 SearchPage（搜题模式）共用
// ═══════════════════════════════════════════════════
import { aiAPI } from "./api";

export function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

/** 压缩图片到 dataURL（最长边 max，JPEG 质量 quality） */
export function compressComposeImage(file, max = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const scale = Math.min(1, max / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法压缩图片"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("图片损坏"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("读取失败"));
    reader.readAsDataURL(file);
  });
}

/** 把已有的 dataURL 再压小一档（首轮云端识图失败时重试使用） */
function recompressDataUrl(dataUrl, max = 960, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const scale = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法压缩图片"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("图片解码失败"));
    img.src = dataUrl;
  });
}

/**
 * 云端识图。返回 { text, visionHints }；失败抛错（调用方决定提示）。
 */
export async function runCloudOcr(dataUrl) {
  const res = await withTimeout(aiAPI.ocr(dataUrl), 25000, "云端识图超时");
  return {
    text: res?.data?.text || "",
    visionHints: res?.data?.visionHints || null,
  };
}

/**
 * 云端识图（带一次降级重试）：
 * 首轮失败后把图片压到 960px / q0.7 再试一次，
 * 覆盖偶发格式错误、大图被拒、服务端瞬时抖动等场景。
 */
export async function runCloudOcrWithRetry(dataUrl) {
  try {
    return await runCloudOcr(dataUrl);
  } catch (firstErr) {
    console.warn("[ocr] 首轮云端识图失败：", firstErr?.message);
    let smaller = dataUrl;
    try {
      smaller = await recompressDataUrl(dataUrl);
    } catch {
      throw firstErr;
    }
    try {
      return await runCloudOcr(smaller);
    } catch (secondErr) {
      console.warn("[ocr] 重试仍失败：", secondErr?.message);
      throw secondErr;
    }
  }
}

/** 没识别出文字时的统一引导（云端 200 但 text 为空） */
export const OCR_EMPTY_HINT =
  "没看清题干文字，请在光线充足处正对题目重拍（避免反光、模糊），或对照图片手动输入题干后点「开始理解」";

/** 把识图失败错误映射成用户能看懂的提示文案 */
export function ocrFailHint(message) {
  const m = String(message || "");
  if (
    /Failed to fetch|NetworkError|Network request failed|超时|Load failed|ECONNREFUSED|fetch/i.test(
      m
    )
  ) {
    return "云端识图连不上，请检查网络后重试，或对照图片手动输入题干后点「开始理解」";
  }
  if (/繁忙|限流|频率|并发|429|too many|limit/i.test(m)) {
    return "识图服务暂时繁忙，请稍后再试，或对照图片手动输入题干后点「开始理解」";
  }
  if (/过大|413/i.test(m)) {
    return "图片过大，请换更清晰的截图或压缩后再试";
  }
  return OCR_EMPTY_HINT;
}
