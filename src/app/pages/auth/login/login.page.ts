import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

  private email: string = null;
  private password: string = null;

  constructor() {
  }

  ngOnInit() {
  }

  public login() {
    console.log(this.email, this.password);
  }

}
