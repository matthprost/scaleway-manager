import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage";

import { ApiService } from "../../../api/api.service";

import { TokenDto, TokensDto } from "./tokens.dto";

@Injectable({
  providedIn: "root",
})
export class TokensService {
  constructor(private api: ApiService, private storage: Storage) {}

  public getToken(token: string): Promise<TokenDto> {
    return this.api.get<TokenDto>(
      `${this.api.getAccountApiUrl()}/tokens/${token}`
    );
  }

  public async getAllTokens(): Promise<TokenDto[]> {
    const currentProject = await this.storage.get("currentProject");

    // tslint:disable-next-line:max-line-length
    const result = await this.api.get<TokensDto>(
      `${this.api.getAccountApiUrl()}/tokens?sort=-creation_date&project_id=${
        currentProject.id
      }&per_page=30&page=1&category=user_created`
    );

    return result.tokens;
  }

  public async addToken(): Promise<TokensDto> {
    const currentProject = await this.storage.get("currentProject");

    return this.api.post<TokensDto>(
      `${this.api.getAccountApiUrl()}/projects/${currentProject.id}/tokens`,
      {
        description: "Scaleway_Manager",
      }
    );
  }

  public deleteToken(token: string): Promise<any> {
    return this.api.delete(`${this.api.getAccountApiUrl()}/tokens/${token}`);
  }
}
