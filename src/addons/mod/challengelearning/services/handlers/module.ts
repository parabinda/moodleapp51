import { Injectable, Type } from '@angular/core';
import { CoreModuleHandlerBase } from '@features/course/classes/module-base-handler';
import { CoreCourseModuleHandler } from '@features/course/services/module-delegate';
import { makeSingleton } from '@singletons';
import {
    ADDON_MOD_CHALLENGELEARNING_COMPONENT,
    ADDON_MOD_CHALLENGELEARNING_MODNAME,
    ADDON_MOD_CHALLENGELEARNING_PAGE_NAME,
} from '../../constants';
import { AddonModChallengeLearning } from '../challengelearning';
import { ModArchetype, ModFeature, ModPurpose } from '@addons/mod/constants';

@Injectable({ providedIn: 'root' })
export class AddonModChallengeLearningModuleHandlerService
    extends CoreModuleHandlerBase
    implements CoreCourseModuleHandler {

    name = ADDON_MOD_CHALLENGELEARNING_COMPONENT;
    modName = ADDON_MOD_CHALLENGELEARNING_MODNAME;
    protected pageName = ADDON_MOD_CHALLENGELEARNING_PAGE_NAME;

    supportedFeatures = {
        [ModFeature.MOD_ARCHETYPE]: ModArchetype.ASSIGNMENT,
        [ModFeature.GROUPS]: false,
        [ModFeature.GROUPINGS]: false,
        [ModFeature.MOD_INTRO]: true,
        [ModFeature.COMPLETION_TRACKS_VIEWS]: true,
        [ModFeature.GRADE_HAS_GRADE]: true,
        [ModFeature.GRADE_OUTCOMES]: false,
        [ModFeature.BACKUP_MOODLE2]: false,
        [ModFeature.SHOW_DESCRIPTION]: true,
        [ModFeature.MOD_PURPOSE]: ModPurpose.ASSESSMENT,
    };

    isEnabled(): Promise<boolean> {
        return AddonModChallengeLearning.isPluginEnabled();
    }

    async getMainComponent(): Promise<Type<unknown>> {
        const { AddonModChallengeLearningIndexComponent } = await import('../../components/index');

        return AddonModChallengeLearningIndexComponent;
    }
}

export const AddonModChallengeLearningModuleHandler =
    makeSingleton(AddonModChallengeLearningModuleHandlerService);
