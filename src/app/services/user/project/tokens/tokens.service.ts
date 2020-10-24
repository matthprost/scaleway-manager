import {Injectable} from '@angular/core';
import {ApiService} from '../../../api/api.service';
import {Storage} from '@ionic/storage';
import {TokenDto, TokensDto} from './tokens.dto';

@Injectable({
  providedIn: 'root'
})
export class TokensService {

  constructor(private api: ApiService, private storage: Storage) {
  }

  public getToken(token: string): Promise<TokenDto> {
    try {
      return this.api.get<TokenDto>(`${this.api.getAccountApiUrl()}/tokens/${token}`);
    } catch (e) {
      throw e;
    }
  }

  public async getAllTokens(): Promise<Array<TokenDto>> {
    try {
      const currentProject = await this.storage.get('currentProject');

      // tslint:disable-next-line:max-line-length
      const result = await this.api.get<TokensDto>(`${this.api.getAccountApiUrl()}/tokens?sort=-creation_date&project_id=${currentProject.id}&per_page=30&page=1&category=user_created`);

      return result.tokens;
    } catch (e) {
      throw e;
    }
  }

  public async addToken(): Promise<TokensDto> {
    try {
      const currentProject = await this.storage.get('currentProject');

      return this.api.post<TokensDto>(`${this.api.getAccountApiUrl()}/projects/${currentProject.id}/tokens`, {
        description: 'Scaleway_Manager'
      });
    } catch (e) {
      throw e;
    }
  }

  public deleteToken(token: string): Promise<any> {
    try {
      return this.api.delete(`${this.api.getAccountApiUrl()}/tokens/${token}`);
    } catch (e) {
      throw e;
    }
  }
}
