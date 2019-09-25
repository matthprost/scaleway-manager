import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router, CanActivate, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {NavParamsService} from '../../services/nav/nav-params.service';

@Injectable({
  providedIn: 'root'
})
export class DoubleAuthGuard implements CanActivate {

  constructor(private router: Router, private navParams: NavParamsService) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
    return new Promise((resolve, reject) => {
      const params = this.navParams.getParams();
      if (params) {
        if (params.email && params.password) {
          resolve(true);
        } else {
          this.router.navigate(['login']);
          resolve(false);
        }
      } else {
        this.router.navigate(['login']);
        resolve(false);
      }
    });
  }
}
