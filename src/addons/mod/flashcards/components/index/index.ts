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

import { Component, OnInit } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreSharedModule } from '@/core/shared.module';
import { CorePromiseUtils } from '@static/promise-utils';
import { ADDON_MOD_FLASHCARDS_COMPONENT_LEGACY } from '../../constants';
import {
    AddonModFlashcards,
    AddonModFlashcardsActivity,
    AddonModFlashcardsCard,
    AddonModFlashcardsDeck,
} from '../../services/flashcards';

/**
 * Component that displays flashcards.
 */
@Component({
    selector: 'addon-mod-flashcards-index',
    templateUrl: 'addon-mod-flashcards-index.html',
    styleUrl: 'index.scss',
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModFlashcardsIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = ADDON_MOD_FLASHCARDS_COMPONENT_LEGACY;
    pluginName = 'flashcards';

    flashcards?: AddonModFlashcardsActivity;
    deck?: AddonModFlashcardsDeck;
    cards: AddonModFlashcardsCard[] = [];
    currentIndex = 0;
    showingBack = false;
    viewedCardIds = new Set<number>();

    protected fetchContentDefaultError = 'addon.mod_flashcards.errorwhileloadingthedeck';

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent();
    }

    /**
     * Current card.
     *
     * @returns Current card, if any.
     */
    get currentCard(): AddonModFlashcardsCard | undefined {
        return this.cards[this.currentIndex];
    }

    /**
     * Whether previous button is disabled.
     *
     * @returns Disabled status.
     */
    get previousDisabled(): boolean {
        return this.currentIndex <= 0;
    }

    /**
     * Whether next button is disabled.
     *
     * @returns Disabled status.
     */
    get nextDisabled(): boolean {
        return this.currentIndex >= this.cards.length - 1;
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        await AddonModFlashcards.invalidateContent(this.module.id, this.courseId, this.flashcards?.deckid);
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        this.flashcards = await AddonModFlashcards.getFlashcards(this.courseId, this.module.id);
        this.description = this.flashcards.intro;
        this.dataRetrieved.emit(this.flashcards);

        const deckResponse = await AddonModFlashcards.getDeck(this.flashcards.deckid);
        this.deck = deckResponse.deck;
        this.cards = deckResponse.cards;
        this.currentIndex = 0;
        this.showingBack = false;
        this.viewedCardIds.clear();

        await this.markCurrentCardViewed();
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonModFlashcards.logView(this.module.instance));

        this.analyticsLogEvent('mod_flashcards_view_flashcards');
    }

    /**
     * Move to the previous card.
     */
    async previous(): Promise<void> {
        if (this.previousDisabled) {
            return;
        }

        this.currentIndex--;
        this.showingBack = false;

        await this.markCurrentCardViewed();
    }

    /**
     * Move to the next card.
     */
    async next(): Promise<void> {
        if (this.nextDisabled) {
            return;
        }

        this.currentIndex++;
        this.showingBack = false;

        await this.markCurrentCardViewed();
    }

    /**
     * Toggle between question and answer images.
     */
    async toggleAnswer(): Promise<void> {
        this.showingBack = !this.showingBack;

        await this.markCurrentCardViewed();
    }

    /**
     * Save viewed progress for the current card once per page session.
     */
    protected async markCurrentCardViewed(): Promise<void> {
        const card = this.currentCard;
        if (!this.flashcards || !card || this.viewedCardIds.has(card.id)) {
            return;
        }

        this.viewedCardIds.add(card.id);

        await CorePromiseUtils.ignoreErrors(AddonModFlashcards.saveProgress(this.flashcards.deckid, card.id));
    }

}
