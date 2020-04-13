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
      return this.objectApi.get(region, bucketName, prefix ? prefix : null);
    } catch (e) {
      throw e;
    }
  }

  public async createBucket(country: 'fr-par' | 'nl-ams', name: string) {
    return this.objectApi.put(country, name);
  }
}
