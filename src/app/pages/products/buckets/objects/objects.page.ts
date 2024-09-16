import { Component, type OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { NavController, PopoverController } from "@ionic/angular";

import { ObjectService } from "../../../../services/object/object.service";

import { OptionsPage } from "./options/options.page";

@Component({
  selector: "app-objects",
  templateUrl: "./objects.page.html",
  styleUrls: ["./objects.page.scss"],
})
export class ObjectsPage implements OnInit {
  public currentPath: string = null;
  public fullPath: string = null;

  private readonly currentRegion: string = null;
  private readonly bucket: string = null;

  public isLoading = true;

  public objectsList = [];
  public foldersList = [];

  public displayName: string = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private objectService: ObjectService,
    private navCtrl: NavController,
    private popoverCtrl: PopoverController
  ) {
    const pathArray = this.router.url.split("/");
    this.currentPath = pathArray[pathArray.length - 1];
    this.fullPath = decodeURI(this.getFullPath());

    this.currentRegion = this.route.snapshot.paramMap.get("region") as string;
    this.bucket = this.route.snapshot.paramMap.get("bucket");

    this.refresh();
  }

  ngOnInit() {}

  ionViewDidEnter() {
    StatusBar.setStyle({ style: StatusBarStyle.Light });
  }

  public doRefresh(refresher) {
    this.refresh()
      .then(() => {
        refresher.target.complete();
      })
      .catch((error) => {
        console.log(error);
        refresher.target.complete();
      });
  }

  private async refresh() {
    try {
      const result = await this.objectService.getAllObjects(
        this.bucket,
        this.currentRegion,
        this.fullPath !== "/" ? this.fullPath : null
      );
      console.log("AWS-RESULT", result);
      this.objectsList = result.ListBucketResult.Contents
        ? this.clean(result.ListBucketResult.Contents)
        : [];
      this.foldersList = result.ListBucketResult.CommonPrefixes
        ? this.clean(result.ListBucketResult.CommonPrefixes)
        : [];
    } catch (e) {
      console.log(e);
    } finally {
      this.isLoading = false;
    }
  }

  private clean(array: any[]) {
    try {
      array.forEach((value, index, object) => {
        if (value.Key) {
          if (this.fullPath !== "") {
            value.Key[0] = value.Key[0].replace(this.fullPath, "");
          }
          value.Key[0] = value.Key[0].replace("/", "");
        } else {
          if (this.fullPath !== "") {
            value.Prefix[0] = value.Prefix[0].replace(this.fullPath, "");
          }
          value.Prefix[0] = value.Prefix[0].replace("/", "");
        }
      });

      array.forEach((value, index, object) => {
        if (value.Key) {
          if (value.Key[0] === "") {
            object.splice(index, 1);
          }
        } else {
          if (value.Prefix[0] === "") {
            object.splice(index, 1);
          }
        }
      });
    } catch (e) {
      console.log(e);
    }

    return array;
  }

  private getFullPath() {
    const value = this.router.url.split("/");
    let fullPath = "";

    value.forEach((result, index) => {
      if (index > 3) {
        fullPath += result + "/";
      }
    });

    return fullPath;
  }

  public async goToSubFolder(name: string) {
    await this.navCtrl.navigateForward([this.router.url + "/" + name]);
  }

  public async openOptions(
    event: any,
    type: "folder" | "standard" | "glacier",
    object: any
  ) {
    const popover = await this.popoverCtrl.create({
      component: OptionsPage,
      componentProps: {
        type,
        region: this.currentRegion,
        object,
        bucket: this.bucket,
        fullPath: this.fullPath,
      },
      translucent: true,
      mode: "ios",
      event,
    });

    await popover.present();
    await popover.onDidDismiss().then((data) => {
      if (data && data.data && data.data.reload) {
        this.refresh();
      }
    });
  }
}
