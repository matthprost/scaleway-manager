import { Component, OnInit } from "@angular/core";
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { ModalController, Platform } from "@ionic/angular";



@Component({
  selector: "app-help",
  templateUrl: "./help.page.html",
  styleUrls: ["./help.page.scss"],
})
export class HelpPage implements OnInit {
  constructor(
    private modalCtrl: ModalController,
    private platform: Platform,
  ) {}

  ngOnInit() {}

  ionViewDidEnter() {
    StatusBar.setStyle({ style: StatusBarStyle.Light });
  }

  public async close() {
    await this.modalCtrl.dismiss({
      dismissed: true,
      close: true,
    });
  }
}
