import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {AlertController} from "ionic-angular";

@Injectable()
export class PostService {

  constructor(private http: HttpClient, private alertCtrl: AlertController) {
  }

  public submit<T>(url: string, token?: string, body?: object): Promise<T> {

    return new Promise((resolve, reject) => {
      this.http.post<T>(url, body,
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
          let alert = this.alertCtrl.create({
            title: 'Error',
            subTitle: result.message,
            buttons: ['Dismiss']
          });
          alert.present();

          let alert2 = this.alertCtrl.create({
            title: 'Error',
            subTitle: result.error.message,
            buttons: ['Dismiss']
          });
          alert2.present();

          console.log(result);
          reject(result);
        });
    })
  }

}
