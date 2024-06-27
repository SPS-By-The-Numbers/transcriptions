import * as Constants from 'config/constants';
import * as Storage from "firebase/storage";
import * as Transcript from 'common/transcript';
import { getDatabase, ref } from "firebase/database";
import { initializeApp } from "firebase/app";

import type { StorageAccessor } from "common/storage";

export const app = initializeApp(Constants.FIREBASE_CLIENT_CONFIG);

export const database = getDatabase(app);
export const dbPublicRoot = ref(database, '/transcripts/public');
export const dbPrivateRoot = ref(database, '/transcripts/private');

// Accessor for the web client using firebase. The web client just uses
// readonly access and in fact only reads uncompressed data as the
// GCS automating gzip transcoding takes care of things here.
//
// If local compression is necessary then the related accessor functions
// can just be implemented.
export class FirebaseWebClientStorageAccessor implements StorageAccessor {
  readBytes(path: string) : Promise<ArrayBuffer> {
    const fileRef = Storage.ref(Storage.getStorage(), path);
    return Storage.getBytes(fileRef);
  }

  writeBytes(path: string, data: string) : Promise<unknown> {
    throw "Unimplemented";
  }

  // Returns uncompressed bytes from an path using lzma.
  readBytesLzma(path: string) : Promise<ArrayBuffer> {
    throw "Unimplemented";
  }
  writeBytesLzma(path: string, data: string) : Promise<unknown> {
    throw "Unimplemented";
  }

  readBytesGzip(path: string) : Promise<ArrayBuffer> {
    throw "Unimplemented";
  }
  writeBytesGzip(path: string, data: string) : Promise<unknown> {
    throw "Unimplemented";
  }
}

export const storageAccessor : StorageAccessor = new FirebaseWebClientStorageAccessor();
