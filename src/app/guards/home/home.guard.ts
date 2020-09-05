import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {Storage} from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class HomeGuard implements CanActivate {
  constructor(private storage: Storage, private router: Router) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot):
    boolean | Observable<boolean> | Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const jwt = await this.storage.get('jwt');
      const currentOrganization = await this.storage.get('currentOrganization');
      if (!jwt || !currentOrganization) {
        await this.storage.remove('jwt');
        await this.storage.remove('user');
        await this.storage.remove('currentOrganization');
        this.router.navigate(['login']);
        resolve(false);
      }
      resolve(true);
    });
  }
}
