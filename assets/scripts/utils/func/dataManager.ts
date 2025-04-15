export class DataManager {
    private static _instance: DataManager;
    private _data: Record<string, any> = {};
  
    static get instance() {
      if (!this._instance) {
        this._instance = new DataManager();
      }
      return this._instance;
    }
  
    set(key: string, value: any) {
      this._data[key] = value;
    }
  
    get<T = any>(key: string): T {
      return this._data[key];
    }
  
    clear() {
      this._data = {};
    }
  }
  