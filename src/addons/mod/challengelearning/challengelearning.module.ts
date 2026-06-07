import { NgModule, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonModChallengeLearningModuleHandler } from './services/handlers/module';
import { ADDON_MOD_CHALLENGELEARNING_PAGE_NAME } from './constants';

const routes: Routes = [
    {
        path: `${ADDON_MOD_CHALLENGELEARNING_PAGE_NAME}/:courseId/:cmId`,
        loadComponent: () => import('./pages/index/index'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(() => {
            CoreCourseModuleDelegate.registerHandler(
                AddonModChallengeLearningModuleHandler.instance,
            );
        }),
    ],
})
export class AddonModChallengeLearningModule {}
