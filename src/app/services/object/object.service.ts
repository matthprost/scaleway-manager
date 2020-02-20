import {Injectable} from '@angular/core';
import {ApiService} from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ObjectService {

  constructor(private api: ApiService) {
  }

  public getBucketsByCountry(country: 'nl-ams' | 'fr-par'): Promise<any> {
    let ApiUrl: string = null;
    country === 'fr-par' ? ApiUrl = this.api.getParisObjectApiUrl() : ApiUrl = this.api.getAmsObjectApiUrl();

    return this.api.get<any>(ApiUrl);
  }
}
