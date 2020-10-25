import {Component, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {Storage} from '@ionic/storage';
import {AccountService} from '../../../services/user/account/account.service';
import {Plugins, StatusBarStyle} from '@capacitor/core';
import {ProjectService} from '../../../services/user/project/project.service';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-change-organization',
  templateUrl: './change-organization.page.html',
  styleUrls: ['./change-organization.page.scss'],
})
export class ChangeOrganizationPage implements OnInit {

  public isLoading = true;
  public organizations = [];
  public currentOrganizationId = null;

  constructor(private modalCtrl: ModalController, private storage: Storage, private accountService: AccountService,
              private projectService: ProjectService) {

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

  public async close(manualClose?: boolean) {
    await this.modalCtrl.dismiss({
      dismissed: true,
      manualClose
    });
  }

  public async save() {
    await this.storage.set('currentOrganization', this.currentOrganizationId);
    await this.projectService.setDefaultProject(this.currentOrganizationId);
    await this.close();
  }

  public async change(event) {
    this.currentOrganizationId = event.detail.value;
  }

}
