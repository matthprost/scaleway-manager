import { Component, OnInit } from '@angular/core';
import {MenuController, NavController} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-bad-request',
  templateUrl: './bad-request.page.html',
  styleUrls: ['./bad-request.page.scss'],
})
export class BadRequestPage implements OnInit {

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
