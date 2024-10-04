import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from "@angular/router";
import { Storage } from "@ionic/storage-angular";
import { Observable } from "rxjs";

import { NavParamsService } from "../../services/nav/nav-params.service";

@Injectable({
  providedIn: "root",
})
export class LoginGuard implements CanActivate {
  constructor(
    private router: Router,
    private navParams: NavParamsService,
    private storage: Storage
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | Observable<boolean> | Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.storage.get("jwt").then((val) => {
        if (val !== null) {
          this.router.navigate(["home"]);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}
