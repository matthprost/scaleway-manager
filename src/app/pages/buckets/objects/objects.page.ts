import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ObjectService} from '../../../services/object/object.service';
import {NavController} from '@ionic/angular';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  public currentPath: string = null;
  public fullPath: string = null;

  private readonly currentRegion: 'fr-par' | 'nl-ams' = null;
  private readonly bucket: string = null;

  public isLoading = true;

  public objectsList = [];
  public foldersList = [];

  constructor(private route: ActivatedRoute, private router: Router, private objectService: ObjectService, private navCtrl: NavController) {
    const pathArray = this.router.url.split('/');
    this.currentPath = pathArray[pathArray.length - 1];
    this.fullPath = this.getFullPath();

    console.log('FULL:', this.fullPath);

    this.currentRegion = this.route.snapshot.paramMap.get('region') as 'fr-par' | 'nl-ams';
    this.bucket = this.route.snapshot.paramMap.get('bucket');

    this.objectService.getAllObjects(this.bucket, this.currentRegion, this.fullPath !== '/' ? this.fullPath : null)
      .then(result => {
        console.log(result);
        this.objectsList = result.ListBucketResult.Contents ? this.clean(result.ListBucketResult.Contents) : [];
        this.foldersList = result.ListBucketResult.CommonPrefixes ? this.clean(result.ListBucketResult.CommonPrefixes) : [];
        this.isLoading = false;
      }).catch(error => {
      this.isLoading = false;
    });
  }

  ngOnInit() {
  }

  private clean(array: Array<any>) {
    try {
      array.forEach((value, index, object) => {
        if (value.Key) {
          if (this.fullPath !== '') {
            value.Key[0] = value.Key[0].replace(this.fullPath, '');
            value.Key[0] = value.Key[0].replace('/', '');
          }
        } else {
          if (this.fullPath !== '') {
            value.Prefix[0] = value.Prefix[0].replace(this.fullPath, '');
            value.Prefix[0] = value.Prefix[0].replace('/', '');
          }
        }
      });

      array.forEach((value, index, object) => {
        if (value.Key) {
          if (value.Key[0] === '') {
            object.splice(index, 1);
          }
        } else {
          if (value.Prefix[0] === '') {
            object.splice(index, 1);
          }
        }
      });
    } catch (e) {
      console.log(e);
    }

    console.log(array);
    return array;
  }

  private getFullPath() {
    const value = this.router.url.split('/');
    let fullPath = '';

    value.forEach((result, index) => {
      if (index > 3) {
        fullPath += result + '/';
      }
    });

    return fullPath;
  }

  public async goToSubFolder(name: string) {
    await this.navCtrl.navigateForward([this.router.url + '/' + name]);
  }

}
