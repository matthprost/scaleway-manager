import {Component, OnInit} from '@angular/core';
import {MenuController, NavController} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-no-internet',
  templateUrl: './no-internet.page.html',
  styleUrls: ['./no-internet.page.scss'],
})
export class NoInternetPage implements OnInit {

  constructor(private menuCtrl: MenuController, private statusBar: StatusBar, private navCtrl: NavController) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
    this.statusBar.styleLightContent();
  }

  public retry() {
    this.navCtrl.navigateRoot(['/home']);
  }

}
