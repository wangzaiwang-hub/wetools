declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    // 添加其他环境变量
  }

  interface Global {
    // 添加全局变量
  }
  
  // 添加Timeout接口
  interface Timeout {}
} 