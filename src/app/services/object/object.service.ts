import {Injectable} from '@angular/core';
import {ObjectApiService} from '../api/object-api.service';

@Injectable({
  providedIn: 'root'
})

export class ObjectService {

  constructor(private objectApi: ObjectApiService) {
  }


  public async getAllBuckets() {
    try {
      const s3par = await this.objectApi.get('fr-par');
      const s3ams = await this.objectApi.get('nl-ams');

      return {
        s3par: s3par.ListAllMyBucketsResult.Buckets[0].Bucket,
        s3ams: s3ams.ListAllMyBucketsResult.Buckets[0].Bucket,
      };
    } catch (e) {
      throw e;
    }
  }

  public async getAllObjects(bucketName: string, region: 'fr-par' | 'nl-ams', prefix?: string) {
    try {
      return this.objectApi.get(region, bucketName, prefix ? '/?delimiter=/&marker=&prefix=' + prefix : '/?delimiter=/&marker=');
    } catch (e) {
      throw e;
    }
  }

  public async createBucket(region: 'fr-par' | 'nl-ams', name: string) {
    return this.objectApi.put(region, name);
  }

  public async deleteObject(bucketName: string, region: 'fr-par' | 'nl-ams', objectName: string) {
    return this.objectApi.delete(region, bucketName, '/' + objectName);
  }

  public async sendToGlacierS3(bucketName: string, region: 'fr-par' | 'nl-ams', path: string, fullPath: string) {
    return this.objectApi.put(
      region,
      bucketName,
      path,
      {'x-amz-storage-class': 'GLACIER', 'x-amz-copy-source': fullPath}
    );
  }

  public async restore(bucketName: string, region: 'fr-par' | 'nl-ams', path: string, fullPath: string) {
    return this.objectApi.put(
      region,
      bucketName,
      path,
      {'x-amz-storage-class': 'STANDARD', 'x-amz-copy-source': fullPath});
  }
}
