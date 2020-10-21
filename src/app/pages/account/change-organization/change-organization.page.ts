import {Component, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {Storage} from '@ionic/storage';
import {AccountService} from '../../../services/user/account/account.service';
import {Plugins, StatusBarStyle} from '@capacitor/core';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-change-organization',
  templateUrl: './change-organization.page.html',
  styleUrls: ['./change-organization.page.scss'],
})
export class ChangeOrganizationPage implements OnInit {

  public isLoading = true;
  public organizations = [];
  public currentOrganizationId;

  constructor(private modalCtrl: ModalController, private storage: Storage, private accountService: AccountService) {

  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    StatusBar.setStyle({style: StatusBarStyle.Light});
    this.storage.get('currentOrganization').then(async currentOrganization => {
      const user = await this.accountService.getUserData();
      this.organizations = user.organizations;
      this.currentOrganizationId = user.organizations.find(organization => organization.id === currentOrganization).id;
      this.isLoading = false;
    });
  }

  public close() {
    this.modalCtrl.dismiss({
      dismissed: true
    });
  }

  public async save() {
    await this.storage.set('currentOrganization', this.currentOrganizationId);
    this.close();
  }

  public change(event) {
    this.currentOrganizationId = event.detail.value;
  }

}
