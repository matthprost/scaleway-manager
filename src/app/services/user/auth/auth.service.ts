import {Injectable} from '@angular/core';
import {ApiService} from '../../api/api.service';
import {AuthTokenDto, TokenDto} from './auth-tokens.dto';
import {Storage} from '@ionic/storage';
import {AccountService} from '../account/account.service';
import {NavController} from '@ionic/angular';
import {ProjectService} from '../project/project.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private api: ApiService, private storage: Storage, private accountService: AccountService, private navCtrl: NavController,
              private projectService: ProjectService) {
  }

  public async login(email: string, password: string, code?: string): Promise<any> {
    try {
      const result = await this.api.post<any>(this.api.getAccountApiUrl() + '/jwt', {
        email,
        password,
        renewable: true,
        '2FA_token': String(code),
      });

      await this.storage.set('jwt', result);

      const data = await this.api.get<any>(this.api.getAccountApiUrl() + '/users/' + result.jwt.issuer);
      await this.storage.set('user', data.user);

      const currentOrganization = data.user.organizations.find(organization => organization.role_name === 'owner');
      await this.storage.set('currentOrganization', currentOrganization.id);

      await this.projectService.setDefaultProject(currentOrganization.id);
    } catch (e) {
      throw e;
    }
  }

  public async logout(): Promise<any> {
    console.log('LOGGING  OUT');
    const token = await this.storage.get('jwt');
    await this.api.delete<any>(this.api.getAccountApiUrl() + '/jwt/' + token.jwt.jti);
    await this.storage.clear();
    await this.navCtrl.navigateRoot(['/login']);
  }

  public getToken(token: string): Promise<AuthTokenDto> {
    try {
      return this.api.get<AuthTokenDto>(this.api.getAccountApiUrl() + '/tokens/' + token);
    } catch (e) {
      throw e;
    }
  }

  public getAllTokens(): Promise<{ 'tokens': Array<TokenDto> }> {
    try {
      return this.api.get<{ 'tokens': Array<TokenDto> }>(this.api.getAccountApiUrl() + '/tokens?valid_forever=&sort=-creation_date');
    } catch (e) {
      throw e;
    }
  }

  public async addToken(): Promise<TokenDto> {
    try {
      const organizationId = await this.storage.get('currentOrganization');

      return this.api.post<TokenDto>(`${this.api.getAccountApiUrl()}/projects/${organizationId}/tokens`, {
        description: 'Scaleway_Manager'
      });
    } catch (e) {
      throw e;
    }
  }

  public deleteToken(token: string): Promise<any> {
    try {
      return this.api.delete(this.api.getAccountApiUrl() + '/tokens/' + token);
    } catch (e) {
      throw e;
    }
  }
}
