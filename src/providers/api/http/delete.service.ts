import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Injectable()
export class DeleteService {

  constructor(private http: HttpClient) {
  }

  public submit<T>(url: string, token?: string): Promise<T> {

    return new Promise((resolve, reject) => {
      this.http.delete<T>(url,
        {
          headers: token ?
            {
              'x-auth-token': token
            } : {}
        }).subscribe(
        data => {
          resolve(data);
        },
        result => {
          console.log(result);
          reject(result);
        });
    })
  }

}
