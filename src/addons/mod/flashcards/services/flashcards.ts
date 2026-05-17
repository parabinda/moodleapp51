// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable } from '@angular/core';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseModuleHelper, CoreCourseModuleStandardElements } from '@features/course/services/course-module-helper';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { CorePromiseUtils } from '@static/promise-utils';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_FLASHCARDS_COMPONENT_LEGACY } from '../constants';

/**
 * Service that provides flashcards functions.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFlashcardsProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModFlashcards:';

    /**
     * Get a flashcards activity by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved with the flashcards activity.
     */
    async getFlashcards(
        courseId: number,
        cmId: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModFlashcardsActivity> {
        const site = await CoreSites.getSite(options.siteId);
        const params: AddonModFlashcardsGetFlashcardsByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getFlashcardsCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_FLASHCARDS_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        const response = await site.read<AddonModFlashcardsGetFlashcardsByCoursesWSResponse>(
            'mod_flashcards_get_flashcards_by_courses',
            params,
            preSets,
        );

        return CoreCourseModuleHelper.getActivityByCmId(response.flashcards, cmId);
    }

    /**
     * Get a deck and its cards.
     *
     * @param deckId Deck ID.
     * @param options Other options.
     * @returns Promise resolved with deck data.
     */
    async getDeck(deckId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModFlashcardsDeckResponse> {
        const site = await CoreSites.getSite(options.siteId);
        const params: AddonModFlashcardsGetDeckWSParams = {
            deckid: deckId,
            onlyvisible: true,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getDeckCacheKey(deckId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_FLASHCARDS_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        return site.read<AddonModFlashcardsDeckResponse>('local_flashcards_get_deck', params, preSets);
    }

    /**
     * Save progress for a card.
     *
     * @param deckId Deck ID.
     * @param cardId Card ID.
     * @param state Progress state.
     * @param options Other options.
     * @returns Promise resolved when progress is saved.
     */
    async saveProgress(
        deckId: number,
        cardId: number,
        state = 'viewed',
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModFlashcardsSaveProgressWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        return site.write<AddonModFlashcardsSaveProgressWSResponse>('local_flashcards_save_progress', {
            deckid: deckId,
            cardid: cardId,
            state,
        });
    }

    /**
     * Invalidate cached content.
     *
     * @param moduleId Module ID.
     * @param courseId Course ID.
     * @param deckId Deck ID.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    async invalidateContent(moduleId: number, courseId: number, deckId?: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        const site = await CoreSites.getSite(siteId);
        const promises: Promise<void>[] = [
            site.invalidateWsCacheForKey(this.getFlashcardsCacheKey(courseId)),
            CoreCourse.invalidateModule(moduleId, siteId, 'flashcards'),
        ];

        if (deckId) {
            promises.push(site.invalidateWsCacheForKey(this.getDeckCacheKey(deckId)));
        }

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Return whether the plugin is enabled in a site.
     *
     * @param siteId Site ID.
     * @returns Promise resolved with enabled status.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_flashcards_get_flashcards_by_courses') &&
            site.wsAvailable('local_flashcards_get_deck');
    }

    /**
     * Report an activity as viewed.
     *
     * @param flashcardsId Flashcards activity instance ID.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    logView(flashcardsId: number, siteId?: string): Promise<void> {
        return CoreCourseLogHelper.log(
            'mod_flashcards_view_flashcards',
            { flashcardsid: flashcardsId },
            ADDON_MOD_FLASHCARDS_COMPONENT_LEGACY,
            flashcardsId,
            siteId,
        );
    }

    /**
     * Get activity cache key.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getFlashcardsCacheKey(courseId: number): string {
        return `${AddonModFlashcardsProvider.ROOT_CACHE_KEY}flashcards:${courseId}`;
    }

    /**
     * Get deck cache key.
     *
     * @param deckId Deck ID.
     * @returns Cache key.
     */
    protected getDeckCacheKey(deckId: number): string {
        return `${AddonModFlashcardsProvider.ROOT_CACHE_KEY}deck:${deckId}`;
    }

}

export const AddonModFlashcards = makeSingleton(AddonModFlashcardsProvider);

/**
 * Flashcards activity returned by mod_flashcards_get_flashcards_by_courses.
 */
export type AddonModFlashcardsActivity = CoreCourseModuleStandardElements & {
    deckid: number;
    showprogress: boolean;
    timecreated: number;
    timemodified: number;
};

/**
 * Flashcard deck.
 */
export type AddonModFlashcardsDeck = {
    id: number;
    conceptid: number;
    courseid: number;
    name: string;
    description?: string;
    descriptionformat: number;
    thumbnailurl?: string;
    freecards: number;
    cardcount: number;
    sortorder: number;
    visible: boolean;
};

/**
 * Flashcard card.
 */
export type AddonModFlashcardsCard = {
    id: number;
    deckid: number;
    frontimageurl: string;
    backimageurl?: string;
    alttext?: string;
    width: number;
    height: number;
    isfree: boolean;
    sortorder: number;
    visible: boolean;
};

/**
 * Result of local_flashcards_get_deck.
 */
export type AddonModFlashcardsDeckResponse = {
    deck: AddonModFlashcardsDeck;
    cards: AddonModFlashcardsCard[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of mod_flashcards_get_flashcards_by_courses.
 */
type AddonModFlashcardsGetFlashcardsByCoursesWSResponse = {
    flashcards: AddonModFlashcardsActivity[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_flashcards_get_flashcards_by_courses.
 */
type AddonModFlashcardsGetFlashcardsByCoursesWSParams = {
    courseids?: number[];
};

/**
 * Params of local_flashcards_get_deck.
 */
type AddonModFlashcardsGetDeckWSParams = {
    deckid: number;
    onlyvisible?: boolean;
};

/**
 * Result of local_flashcards_save_progress.
 */
type AddonModFlashcardsSaveProgressWSResponse = {
    status: boolean;
    progressid: number;
    timesviewed: number;
    warnings?: CoreWSExternalWarning[];
};
