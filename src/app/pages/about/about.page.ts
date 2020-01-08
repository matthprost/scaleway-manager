import {Component, OnInit} from '@angular/core';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage implements OnInit {

  constructor(private statusBar: StatusBar) {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

}
