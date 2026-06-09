import { Component, OnInit } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@static/promise-utils';
import { ADDON_MOD_FLASHCARDS_COMPONENT_LEGACY } from '../../constants';
import {
    AddonModFlashcards,
    AddonModFlashcardsActivity,
    AddonModFlashcardsCard,
    AddonModFlashcardsDeck,
} from '../../services/flashcards';

type ViewState = 'intro' | 'study' | 'complete';

@Component({
    selector: 'addon-mod-flashcards-index',
    templateUrl: 'addon-mod-flashcards-index.html',
    styleUrl: 'index.scss',
    imports: [
        CoreSharedModule,
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
    flipped = false;
    view: ViewState = 'intro';
    viewedCardIds = new Set<number>();

    protected fetchContentDefaultError = 'addon.mod_flashcards.errorwhileloadingthedeck';

    async ngOnInit(): Promise<void> {
        super.ngOnInit();
        await this.loadContent();
    }

    get currentCard(): AddonModFlashcardsCard | undefined {
        return this.cards[this.currentIndex];
    }

    get previousDisabled(): boolean {
        return this.currentIndex <= 0;
    }

    get nextIsLast(): boolean {
        return this.currentIndex >= this.cards.length - 1;
    }

    get progressPercent(): number {
        if (!this.cards.length) return 0;

        return ((this.currentIndex + 1) / this.cards.length) * 100;
    }

    get hasPremiumCards(): boolean {
        return !!this.deck && this.deck.freecards < this.deck.cardcount;
    }

    protected async invalidateContent(): Promise<void> {
        await AddonModFlashcards.invalidateContent(this.module.id, this.courseId, this.flashcards?.deckid);
    }

    protected async fetchContent(): Promise<void> {
        this.flashcards = await AddonModFlashcards.getFlashcards(this.courseId, this.module.id);
        this.dataRetrieved.emit(this.flashcards);

        const deckResponse = await AddonModFlashcards.getDeck(this.flashcards.deckid);
        this.deck = deckResponse.deck;
        this.cards = deckResponse.cards;
        this.currentIndex = 0;
        this.flipped = false;
        this.viewedCardIds.clear();
        this.view = 'intro';
    }

    protected async logActivity(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonModFlashcards.logView(this.module.instance));
        this.analyticsLogEvent('mod_flashcards_view_flashcards');
    }

    startLearning(): void {
        this.currentIndex = 0;
        this.flipped = false;
        this.view = 'study';
        CorePromiseUtils.ignoreErrors(this.markCurrentCardViewed());
    }

    flipCard(): void {
        if (!this.currentCard?.backimageurl) return;
        this.flipped = !this.flipped;
        CorePromiseUtils.ignoreErrors(this.markCurrentCardViewed());
    }

    async previous(): Promise<void> {
        if (this.previousDisabled) return;
        this.currentIndex--;
        this.flipped = false;
        await this.markCurrentCardViewed();
    }

    async next(): Promise<void> {
        if (this.nextIsLast) {
            this.view = 'complete';

            return;
        }
        this.currentIndex++;
        this.flipped = false;
        await this.markCurrentCardViewed();
    }

    studyAgain(): void {
        this.currentIndex = 0;
        this.flipped = false;
        this.viewedCardIds.clear();
        this.view = 'study';
        CorePromiseUtils.ignoreErrors(this.markCurrentCardViewed());
    }

    unlockAll(): void {
        CoreNavigator.back();
    }

    protected async markCurrentCardViewed(): Promise<void> {
        const card = this.currentCard;
        if (!this.flashcards || !card || this.viewedCardIds.has(card.id)) return;
        this.viewedCardIds.add(card.id);
        await CorePromiseUtils.ignoreErrors(AddonModFlashcards.saveProgress(this.flashcards.deckid, card.id));
    }

}
