import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  AlertController,
  NavController,
  Platform,
  ToastController,
} from "@ionic/angular";

import { BmaasService } from "../../../../services/bmaas/bmaas.service";

@Component({
  selector: "app-details",
  templateUrl: "./details.page.html",
  styleUrls: ["./details.page.scss"],
})
export class DetailsPage implements OnInit {
  public isLoading = true;
  public serverError = false;

  public server: any;

  constructor(
    private bmaasService: BmaasService,
    private toastCtrl: ToastController,
    private alertController: AlertController,
    private route: ActivatedRoute,
    private platform: Platform,
    private navCtrl: NavController
  ) {}

  ngOnInit() {}
}
