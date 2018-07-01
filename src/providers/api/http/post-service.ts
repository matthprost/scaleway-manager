import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Injectable()
export class PostService {

    constructor(private http: HttpClient) {
    }

    public submit<T>(url: string, token?: string, body?: object): Promise<T> {

        return new Promise((resolve, reject) => {
            this.http.post<T>(url, body).subscribe(
                data => {
                    resolve(data);
                },
                result => {
                    if (result.status = 401) {
                        if (result.error.errors) {
                            reject(result.error.errors[Object.keys(result.error.errors)[0]]);
                        } else {
                            reject('401 Unauthorized');
                        }
                    } else {
                        reject(result);
                    }
                });
        })
    }

}
