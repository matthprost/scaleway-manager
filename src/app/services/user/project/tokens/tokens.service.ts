import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";

import { ApiService } from "../../../api/api.service";

import { TokenDto, TokensDto } from "./tokens.dto";
import {UserDto} from "../../account/account.dto";


type IAMUser = {
  total_count: number;
  users: (UserDto & {id: string})[];
}

@Injectable({
  providedIn: "root",
})
export class TokensService {
  constructor(private api: ApiService, private storage: Storage) {}

  public getToken(token: string): Promise<TokenDto> {
    return this.api.get<TokenDto>(
      `${this.api.getIAMApiUrl()}/api-keys/${token}`
    );
  }

  public async getAllTokens(): Promise<TokenDto[]> {
    const currentProject = await this.storage.get("currentProject");

    // tslint:disable-next-line:max-line-length
    const result = await this.api.get<TokensDto>(
      `${this.api.getIAMApiUrl()}/api-keys?bearer_type=unknown_bearer_type&order_by=access_key_asc&organization_id=${currentProject.organization_id}&page=1&page_size=50`
    );

    return result.api_keys;
  }

  public async addToken(): Promise<TokensDto> {
    const currentProject = await this.storage.get("currentProject");
    const localUser = await this.storage.get("user") as UserDto;
    const userData = await this.api.get(`${this.api.getIAMApiUrl()}/users?organization_id=${currentProject.organization_id}`) as IAMUser;

    const user = userData.users.find(user => user.account_root_user_id === localUser.account_root_user_id)

    return this.api.post<TokensDto>(
      `${this.api.getIAMApiUrl()}/api-keys`,
      {
        description: "Scaleway_Manager",
        default_project_id: currentProject.id,
        user_id: user.id,
      }
    );
  }

  public deleteToken(token: string): Promise<any> {
    return this.api.delete(`${this.api.getIAMApiUrl()}/api-keys/${token}`);
  }
}
