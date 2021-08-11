import { Injectable } from "@angular/core";
import { NavController } from "@ionic/angular";
import { Storage } from "@ionic/storage";

import { ApiService } from "../../api/api.service";
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
        this.api.getAccountApiUrl() + "/jwt",
        {
          email,
          password,
          renewable: true,
          "2FA_token": code && code.toString(),
          captcha,
        }
      );

      await this.storage.set("jwt", result);

      const data = await this.api.get<any>(
        this.api.getAccountApiUrl() + "/users/" + result.jwt.issuer
      );
      await this.storage.set("user", data.user);

      const currentOrganization =
        data.user.organizations.find(
          (organization) => organization.role_name === "owner"
        ) || data.user.organizations[0];
      await this.storage.set("currentOrganization", currentOrganization.id);

      await this.projectService.setDefaultProject(currentOrganization.id);
    } catch (e) {
      throw e
    }
  }

  public async logout(): Promise<any> {
    console.log("LOGGING  OUT");
    const token = await this.storage.get("jwt");
    await this.api.delete<any>(
      this.api.getAccountApiUrl() + "/jwt/" + token.jwt.jti
    );
    await this.storage.clear();
    await this.navCtrl.navigateRoot(["/login"]);
  }
}
