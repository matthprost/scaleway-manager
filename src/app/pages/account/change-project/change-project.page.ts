import {Component, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {Storage} from '@ionic/storage';
import {Plugins, StatusBarStyle} from '@capacitor/core';
import {ProjectService} from '../../../services/user/project/project.service';

const {StatusBar} = Plugins;

@Component({
  selector: 'app-change-project',
  templateUrl: './change-project.page.html',
  styleUrls: ['./change-project.page.scss'],
})
export class ChangeProjectPage implements OnInit {

  public isLoading = true;
  public projects = [];
  public currentProjectId = null;

  constructor(private modalCtrl: ModalController, private storage: Storage, private projectService: ProjectService) {
  }

  ngOnInit() {
  }

  ionViewDidEnter() {
    StatusBar.setStyle({style: StatusBarStyle.Light});

    Promise.all([
      this.projectService.getCurrentProject().then(currentProject => this.currentProjectId = currentProject.id),
      this.projectService.getProjects().then(projects => this.projects = projects)
    ]).then(() => this.isLoading = false);
  }

  public async close(manualClose?: boolean) {
    await this.modalCtrl.dismiss({
      dismissed: true,
      manualClose
    });
  }

  public async save() {
    await this.projectService.setCurrentProject(this.projects.find(project => project.id === this.currentProjectId));
    await this.close();
  }

  public change(event) {
    this.currentProjectId = event.detail.value;
  }

}
