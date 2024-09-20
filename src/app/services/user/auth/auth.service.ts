import { Injectable } from "@angular/core";
import { NavController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";

import { ApiService } from "../../api/api.service";
import {UserDto} from "../account/account.dto";
import { AccountService } from "../account/account.service";
import { ProjectService } from "../project/project.service";

type loginProps = {
  email: string;
  password: string;
  captcha: string;
  code?: string;
};

@Injectable({
  providedIn: "root",
})
export class AuthService {
  constructor(
    private api: ApiService,
    private storage: Storage,
    private accountService: AccountService,
    private navCtrl: NavController,
    private projectService: ProjectService
  ) {}

  public async login({
    email,
    password,
    captcha,
    code,
  }: loginProps): Promise<any> {
    // eslint-disable-next-line no-useless-catch
    try {
      const result = await this.api.post<any>(
        this.api.getAccountApiUrlV2() + "/login",
        {
          email,
          password,
          renewable: true,
          otp: code && code.toString(),
          captcha,
        }
      );

      console.log('>> LOGIN RESULT', result)

      await this.storage.set("jwt", result);

      const iamUser = await this.api.get<any>(`${this.api.getIAMApiUrl()}/users/${result.jwt.issuer_id}`)

      console.log('>> IAM USER', iamUser)

      await this.storage.set("iam", iamUser);

      const data = await this.api.get<UserDto>(
        this.api.getAccountApiUrlV2() + "/users/" + iamUser.account_root_user_id
      );

      console.log('>> DATA', data)


      await this.storage.set("user", data);

      const currentOrganization =
        data.organizations.find(
          (organization) => organization.is_owner === true
        ) || data.organizations[0];
      await this.storage.set("currentOrganization", currentOrganization.id);

      await this.projectService.setDefaultProject(currentOrganization.id);

      console.log('>> LOGIN SERVICE DONE!')
    } catch (e) {
      console.log(e)
      throw e
    }
  }

  public async logout(): Promise<any> {
    console.log("LOGGING  OUT");
    const token = await this.storage.get("jwt");
    this.api.delete<any>(
      this.api.getIAMApiUrl() + "/jwts/" + token.jwt.jti
    );
    await this.storage.clear();
    await this.navCtrl.navigateRoot(["/login"]);
  }
}
