import { toast } from 'react-hot-toast';

interface CacheOptions {
  expireTime?: number; // 过期时间（毫秒）
  version?: string; // 缓存版本号
}

export class Cache {
  private static readonly CACHE_PREFIX = 'project_bolt_';
  private static readonly VERSION_KEY = 'cache_version';

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param options 缓存选项
   */
  static set<T>(key: string, value: T, options: CacheOptions = {}): void {
    try {
      const cacheData = {
        data: value,
        timestamp: Date.now(),
        expireTime: options.expireTime,
        version: options.version
      };
      localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('设置缓存失败:', error);
      toast.error('设置缓存失败');
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值或null
   */
  static get<T>(key: string): T | null {
    try {
      const cacheStr = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cacheStr) return null;

      const cacheData = JSON.parse(cacheStr);
      
      // 检查是否过期
      if (cacheData.expireTime && 
          Date.now() - cacheData.timestamp > cacheData.expireTime) {
        this.remove(key);
        return null;
      }

      // 检查版本号
      if (cacheData.version) {
        const currentVersion = localStorage.getItem(this.VERSION_KEY);
        if (currentVersion !== cacheData.version) {
          this.remove(key);
          return null;
        }
      }

      return cacheData.data;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(this.CACHE_PREFIX + key);
    } catch (error) {
      console.error('删除缓存失败:', error);
    }
  }

  /**
   * 清空所有缓存
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  /**
   * 设置缓存版本号
   * @param version 版本号
   */
  static setVersion(version: string): void {
    try {
      localStorage.setItem(this.VERSION_KEY, version);
    } catch (error) {
      console.error('设置缓存版本号失败:', error);
    }
  }
} 