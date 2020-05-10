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
    return new Promise((resolve, reject) => {
      this.storage.get('jwt').then((val) => {
        if (val === null) {
          this.router.navigate(['login']);
          resolve(false);
        } else {
          resolve(true);
        }
      }).catch((error) => {
        this.router.navigate(['login']);
        resolve(false);
      });
    });
  }
}
