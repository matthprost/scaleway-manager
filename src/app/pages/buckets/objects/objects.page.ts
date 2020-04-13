import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ObjectService} from '../../../services/object/object.service';

@Component({
  selector: 'app-objects',
  templateUrl: './objects.page.html',
  styleUrls: ['./objects.page.scss'],
})
export class ObjectsPage implements OnInit {

  public currentPath: string = null;
  private readonly currentRegion: 'fr-par' | 'nl-ams' = null;
  private readonly bucket: string = null;

  public objectsList = [];

  constructor(private route: ActivatedRoute, private router: Router, private objectService: ObjectService) {
    const pathArray = this.router.url.split('/');
    this.currentPath = pathArray[pathArray.length - 1];

    this.currentRegion = this.route.snapshot.paramMap.get('region') as 'fr-par' | 'nl-ams';
    this.bucket = this.route.snapshot.paramMap.get('bucket');

    this.objectService.getAllObjects(this.bucket, this.currentRegion, this.bucket !== this.currentPath ? this.currentPath : null)
      .then(result => {
      console.log(result);
      this.objectsList = result.ListBucketResult.Contents;
    });
  }

  ngOnInit() {
  }

}
