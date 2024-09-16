import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  CanActivate,
  Router,
} from "@angular/router";
import { Storage } from "@ionic/storage-angular";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class HomeGuard implements CanActivate {
  constructor(private storage: Storage, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | Observable<boolean> | Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const jwt = await this.storage.get("jwt");
      const currentOrganization = await this.storage.get("currentOrganization");
      const currentProject = await this.storage.get("currentProject");
      if (!jwt || !currentOrganization || !currentProject) {
        await this.storage.clear();
        this.router.navigate(["login"]);
        console.warn("HOME GUARD NOT VALIDATED");
        resolve(false);
      }
      resolve(true);
    });
  }
}
