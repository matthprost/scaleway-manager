import {Component, OnInit} from '@angular/core';
import {AlertController, NavController, Platform, ToastController} from '@ionic/angular';
import {BmaasService} from '../../../../services/bmaas/bmaas.service';
import {Clipboard} from '@ionic-native/clipboard/ngx';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
})
export class DetailsPage implements OnInit {

  public isLoading = true;
  public serverError = false;

  public server: any;

  constructor(private bmaasService: BmaasService,
              private toastCtrl: ToastController, private clipboard: Clipboard, private alertController: AlertController,
              private route: ActivatedRoute, private platform: Platform,
              private navCtrl: NavController) {
  }

  ngOnInit() {
  }

  public async copyToClipBoard(text: string) {
    if (this.platform.is('cordova')) {
      await this.clipboard.copy(text);

      const toast = await this.toastCtrl.create({
        message: 'Address has been copied into your clipboard!',
        duration: 3000,
        position: 'top',
        color: 'secondary',
        showCloseButton: true,
        mode: 'ios',
      });

      await toast.present();
    } else {
      console.warn('Feature only available on cordova');
    }
  }

}
