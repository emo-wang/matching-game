import { sys, native } from 'cc';

export default class FileStorage {
  private static getNativePath(filename: string): string {
    return native.fileUtils.getWritablePath() + filename;
  }

  static save(key: string, value: string, filename?: string) {
    if (sys.isNative) {
      const path = this.getNativePath(filename || key + '.txt');
      native.fileUtils.writeStringToFile(value, path);
    } else {
      sessionStorage.setItem(key, value);
    }
  }

  static load(key: string, filename?: string): string | null {
    if (sys.isNative) {
      const path = this.getNativePath(filename || key + '.txt');
      if (native.fileUtils.isFileExist(path)) {
        return native.fileUtils.getStringFromFile(path);
      }
      return null;
    } else {
      return sessionStorage.getItem(key);
    }
  }

  static clear(key: string, filename?: string) {
    if (sys.isNative) {
      const path = this.getNativePath(filename || key + '.txt');
      if (native.fileUtils.isFileExist(path)) {
        native.fileUtils.removeFile(path);
      }
    } else {
      sessionStorage.removeItem(key);
    }
  }

  static exists(key: string, filename?: string): boolean {
    if (sys.isNative) {
      const path = this.getNativePath(filename || key + '.txt');
      return native.fileUtils.isFileExist(path);
    } else {
      return sessionStorage.getItem(key) !== null;
    }
  }
}
