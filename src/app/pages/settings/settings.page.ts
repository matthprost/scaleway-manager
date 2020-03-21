import {Component, OnInit} from '@angular/core';
import {AppVersion} from '@ionic-native/app-version/ngx';
import {PickerController, Platform} from '@ionic/angular';
import {Storage} from '@ionic/storage';
import {StatusBar} from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  public version = null;
  public isLoading = false;
  public changeHasBeenDone = false;

  // DEFAULT VALUES IN CASE STORAGE IS EMPTY
  public instancesToDisplay = 6;

  constructor(private appVersion: AppVersion, private platform: Platform, private storage: Storage,
              private pickerController: PickerController, private statusBar: StatusBar) {
    if (this.platform.is('cordova')) {
      this.appVersion.getVersionNumber().then(versionNumber => {
        this.version = versionNumber;
      });
    }

    this.storage.get('settings').then(result => {
      if (result) {
        result.instancesToDisplay ? this.instancesToDisplay = result.instancesToDisplay : this.instancesToDisplay = 6;
      }
    });
  }

  private static getColumns(numColumns, numOptions, columnOptions) {
    const columns = [];
    for (let i = 0; i < numColumns; i++) {
      columns.push({
        name: `col${i}`,
        options: SettingsPage.getColumnOptions(i, numOptions, columnOptions)
      });
    }

    return columns;
  }

  private static getColumnOptions(columnIndex, numOptions, columnOptions) {
    const options = [];
    for (let i = 0; i < numOptions; i++) {
      options.push({
        text: columnOptions[columnIndex][i % numOptions],
        value: i
      });
    }

    return options;
  }

  ionViewDidEnter() {
    this.statusBar.styleDefault();
  }

  ngOnInit() {
  }

  async openPicker() {
    const defaultColumnOptions = [
      [
        '2 Instances',
        '4 Instances',
        '6 Instances',
        '8 Instances',
        '10 Instances',
      ]
    ];

    const picker = await this.pickerController.create({
      columns: SettingsPage.getColumns(1, 5, defaultColumnOptions),
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: (value) => {
            this.changeHasBeenDone = true;
            this.instancesToDisplay = value.col0.text.substr(0, value.col0.text.indexOf(' '));
          }
        }
      ]
    });

    await picker.present();
  }

  public save() {
    this.isLoading = true;
    this.storage.set('settings', {instancesToDisplay: this.instancesToDisplay}).then(() => {
      this.isLoading = false;
      this.changeHasBeenDone = false;
    });
  }

}
