import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { DoubleAuthGuard } from './guards/double-auth/double-auth.guard';
import { HomeGuard } from './guards/home/home.guard';
import { LoginGuard } from './guards/login/login.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    children: [
      {
        path: '',
        loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule),
      },
      {
        path: 'account',
        children: [
          {
            path: '',
            loadChildren: () => import('./pages/account/account.module').then(m => m.AccountPageModule),
          },
          {
            path: 'ssh-keys',
            loadChildren: () => import('./pages/account/ssh-keys/ssh-keys.module').then(m => m.SshKeysPageModule),
          },
          {
            path: 'tokens',
            loadChildren: () => import('./pages/account/tokens/tokens.module').then(m => m.TokensPageModule),
          },
        ],
      },
    ],
    canActivate: [HomeGuard],
  },
  {
    path: 'instances',
    children: [
      {
        path: '',
        loadChildren: () => import('./pages/products/instances/instances.module').then(m => m.InstancesPageModule),
      },
      {
        path: ':zone/:id',
        loadChildren: () => import('./pages/products/instances/details/details.module').then(m => m.DetailsPageModule),
      },
    ],
    canActivate: [HomeGuard],
  },
  {
    path: 'login',
    children: [
      {
        path: '',
        loadChildren: () => import('./pages/auth/login/login.module').then(m => m.LoginPageModule),
        canActivate: [LoginGuard],
      },
      {
        path: 'double-auth',
        loadChildren: () => import('./pages/auth/double-auth/double-auth.module').then(m => m.DoubleAuthPageModule),
        canActivate: [DoubleAuthGuard],
      },
    ],
  },
  {
    path: 'about',
    loadChildren: () => import('./pages/about/about.module').then(m => m.AboutPageModule),
    canActivate: [HomeGuard],
  },
  {
    path: 'billing',
    loadChildren: () => import('./pages/billing/billing.module').then(m => m.BillingPageModule),
    canActivate: [HomeGuard],
  },
  {
    path: 'settings',
    loadChildren: () => import('./pages/settings/settings.module').then(m => m.SettingsPageModule),
    canActivate: [HomeGuard],
  },
  {
    path: 'help',
    loadChildren: () => import('./pages/auth/login/help/help.module').then(m => m.HelpPageModule),
    canActivate: [HomeGuard],
  },
  // {
  //   path: 'buckets',
  //   children: [
  //     {
  //       path: '',
  //       loadChildren: () => import('./pages/products/buckets/buckets.module').then(m => m.BucketsPageModule),
  //     },
  //     {
  //       path: ':region/:bucket',
  //       children: [
  //         {
  //           path: '',
  //           loadChildren: () => import('./pages/products/buckets/objects/objects.module').then(m => m.ObjectsPageModule),
  //         },
  //         {
  //           path: '**',
  //           loadChildren: () => import('./pages/products/buckets/objects/objects.module').then(m => m.ObjectsPageModule),
  //         },
  //       ],
  //     },
  //   ],
  // },
  {
    path: 'change-project',
    loadChildren: () => import('./pages/account/change-project/change-project.module').then(m => m.ChangeProjectPageModule),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
