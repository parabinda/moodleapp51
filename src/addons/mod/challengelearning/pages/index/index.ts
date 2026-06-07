import { Component, viewChild } from '@angular/core';
import { CoreCourseModuleMainActivityPage } from '@features/course/classes/main-activity-page';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModChallengeLearningIndexComponent } from '../../components/index';

@Component({
    selector: 'page-addon-mod-challengelearning-index',
    templateUrl: 'index.html',
    imports: [
        CoreSharedModule,
        AddonModChallengeLearningIndexComponent,
    ],
})
export default class AddonModChallengeLearningIndexPage
    extends CoreCourseModuleMainActivityPage<AddonModChallengeLearningIndexComponent> {

    readonly activityComponent = viewChild.required(AddonModChallengeLearningIndexComponent);
}
