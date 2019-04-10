import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', loadChildren: './home/home.module#HomePageModule' },
  { path: 'about', loadChildren: './about/about.module#AboutPageModule' },
  { path: 'account', loadChildren: './account/account.module#AccountPageModule' },
  { path: 'login', loadChildren: './auth/login/login.module#LoginPageModule' },
  { path: 'doubleauth', loadChildren: './auth/double-auth/doubleauth.module#DoubleAuthPageModule' },
  { path: 'billing', loadChildren: './billing/billing.module#BillingPageModule' },
  { path: 'bugreport', loadChildren: './bug-report/bugreport.module#BugReportPageModule' },
  { path: 'contact', loadChildren: './contact/contact.module#ContactPageModule' },
  { path: 'server', loadChildren: './server/server.module#ServerPageModule' },
  { path: 'showserver', loadChildren: './server/show-server/showserver.module#ShowServerPageModule' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
