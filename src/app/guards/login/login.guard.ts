import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {NavParamsService} from '../../services/nav/nav-params.service';
import {Storage} from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(private router: Router, private navParams: NavParamsService, private storage: Storage) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.storage.get('token').then((val) => {
        if (val) {
          this.router.navigate(['home']);
        }
      });
    });
  }
}
