import { Component, OnInit } from '@angular/core';
import {MenuController, NavController} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
})
export class NotFoundPage implements OnInit {

  constructor(private menuCtrl: MenuController, private statusBar: StatusBar, private navCtrl: NavController) { }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
    this.statusBar.styleLightContent();
  }

  public navigateHome() {
    this.navCtrl.navigateRoot(['/home']);
  }

}
