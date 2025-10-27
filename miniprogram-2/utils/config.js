// 第三方API配置
export const API_CONFIG = {
    baseURL: 'https://teleagi.cn/api/v1/video/generation',
    apiKey: 'your-api-key', // 实际使用时替换
    secret: 'your-secret', // 实际使用时替换
    timeout: 1800000, // 30分钟超时
  };
  
  // 生成参数配置
  export const GENERATION_CONFIG = {
    width: 720,
    height: 720,
    negative_prompt: 'low quality, blur, distorted, ugly',
    steps: 20,
    cfg_scale: 7.5,
  };