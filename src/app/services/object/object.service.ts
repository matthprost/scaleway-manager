import {Injectable} from '@angular/core';
import {ObjectApiService} from '../api/object-api.service';
import {zones} from './config';


@Injectable({
  providedIn: 'root'
})

export class ObjectService {

  constructor(private objectApi: ObjectApiService) {
  }

  private mergeZones(zonesValue: Array<any>) {
    // We filter array to removed undefined values
    const valuesList = zonesValue.filter(zone => zone);
    return [].concat(...valuesList);
  }

  public async getAllBuckets() {
    try {
      const result = await Promise.all(zones.map(async zone => {
        const value = await this.objectApi.get(zone);
        const buckets = value.ListAllMyBucketsResult.Buckets[0].Bucket;
        return buckets && buckets.map(bucket => ({...bucket, zone}));
      }));

      return this.mergeZones(result);
    } catch (e) {
      throw e;
    }
  }

  public async getAllObjects(bucketName: string, region: string, prefix?: string) {
    try {
      return this.objectApi.get(region, bucketName, prefix ? '/?delimiter=/&marker=&prefix=' + prefix : '/?delimiter=/&marker=');
    } catch (e) {
      throw e;
    }
  }

  public async createBucket(region: string, name: string) {
    return this.objectApi.put(region, name);
  }

  public async deleteObject(bucketName: string, region: string, path: string) {
    return this.objectApi.delete(region, bucketName, path);
  }

  public async copyObject(bucketName: string, region: string, path: string, fullPath: string) {
    return this.objectApi.put(
      region,
      bucketName,
      path,
      {'X-amz-copy-source': fullPath}
    );
  }

  public async sendToGlacierS3(bucketName: string, region: string, path: string, fullPath: string) {
    return this.objectApi.put(
      region,
      bucketName,
      path,
      {'X-amz-storage-class': 'GLACIER', 'X-amz-copy-source': fullPath}
    );
  }

  /*public async restore(bucketName: string, region: string, path: string, fullPath: string) {
    return this.objectApi.post(
      region,
      bucketName,
      path + '?restore',
      {
        ContentType: 'application/octet-stream',
      });
  }*/
}
