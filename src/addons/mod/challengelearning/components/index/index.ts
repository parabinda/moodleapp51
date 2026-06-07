import { Component, OnInit } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreTimeUtils } from '@services/utils/time';
import {
    AddonModChallengeLearning,
    AddonModChallengeLearningOverview,
    AddonModChallengeLearningQuestion,
    AddonModChallengeLearningSubmitResult,
    AddonModChallengeLearningAchievement,
} from '../../services/challengelearning';
import { ADDON_MOD_CHALLENGELEARNING_COMPONENT_LEGACY } from '../../constants';

type ViewState = 'dashboard' | 'challenge' | 'results';

@Component({
    selector: 'addon-mod-challengelearning-index',
    templateUrl: 'addon-mod-challengelearning-index.html',
    styleUrl: 'index.scss',
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModChallengeLearningIndexComponent
    extends CoreCourseModuleMainResourceComponent
    implements OnInit {

    component = ADDON_MOD_CHALLENGELEARNING_COMPONENT_LEGACY;
    pluginName = 'challengelearning';

    // View state
    view: ViewState = 'dashboard';

    // Dashboard data
    overview?: AddonModChallengeLearningOverview;

    // Challenge data
    sessionId = 0;
    totalQuestions = 0;
    questionNumber = 0;
    currentQuestion?: AddonModChallengeLearningQuestion;
    selectedAnswerId: number | null = null;
    submitting = false;
    answerResult?: AddonModChallengeLearningSubmitResult;

    // Results data
    sessionCorrect = 0;
    sessionTotal = 0;
    finalAchievements: AddonModChallengeLearningAchievement[] = [];

    protected fetchContentDefaultError = 'addon.mod_challengelearning.error_loading';

    async ngOnInit(): Promise<void> {
        super.ngOnInit();
        await this.loadContent();
    }

    protected async invalidateContent(): Promise<void> {
        await AddonModChallengeLearning.invalidateContent(
            this.module.id, this.courseId, this.module.instance,
        );
    }

    protected async fetchContent(): Promise<void> {
        this.overview = await AddonModChallengeLearning.getOverview(this.module.instance);
        this.view = 'dashboard';
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected async logActivity(): Promise<void> {}

    async startChallenge(): Promise<void> {
        if (this.submitting) return;
        this.submitting = true;
        try {
            // Invalidate overview cache so dashboard refreshes after session.
            await AddonModChallengeLearning.invalidateContent(
                this.module.id, this.courseId, this.module.instance,
            );
            const result = await AddonModChallengeLearning.startSession(this.module.instance);
            this.sessionId        = result.sessionid;
            this.totalQuestions   = result.total_questions;
            this.questionNumber   = 1;
            this.currentQuestion  = result.question;
            this.selectedAnswerId = null;
            this.answerResult     = undefined;
            this.view = 'challenge';
        } catch {
            // Error handled by parent class.
        } finally {
            this.submitting = false;
        }
    }

    async selectAnswer(answerId: number): Promise<void> {
        if (this.selectedAnswerId !== null || this.submitting || !this.currentQuestion) return;

        this.selectedAnswerId = answerId;
        this.submitting = true;
        try {
            const result = await AddonModChallengeLearning.submitAnswer(
                this.sessionId,
                this.currentQuestion.id,
                answerId,
            );
            this.answerResult = result;
            if (result.is_last) {
                this.sessionCorrect       = result.session_correct;
                this.sessionTotal         = result.session_total;
                this.finalAchievements    = result.achievements ?? [];
            }
        } catch {
            this.selectedAnswerId = null;
        } finally {
            this.submitting = false;
        }
    }

    async nextQuestion(): Promise<void> {
        if (!this.answerResult) return;

        if (this.answerResult.is_last) {
            this.overview = await AddonModChallengeLearning.getOverview(this.module.instance);
            this.view = 'results';
        } else if (this.answerResult.next_question) {
            this.currentQuestion  = this.answerResult.next_question;
            this.questionNumber++;
            this.selectedAnswerId = null;
            this.answerResult     = undefined;
        }
    }

    async playAgain(): Promise<void> {
        this.view = 'dashboard';
        await this.startChallenge();
    }

    backToDashboard(): void {
        this.selectedAnswerId = null;
        this.answerResult     = undefined;
        this.view = 'dashboard';
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    isSelected(answerId: number): boolean {
        return this.selectedAnswerId === answerId;
    }

    isCorrectAnswer(answerId: number): boolean {
        return !!this.answerResult && answerId === this.answerResult.correct_answer_id;
    }

    isWrongSelected(answerId: number): boolean {
        return !!this.answerResult &&
            answerId === this.selectedAnswerId &&
            answerId !== this.answerResult.correct_answer_id;
    }

    get scoreBarWidth(): number {
        return Math.min(100, this.answerResult
            ? this.answerResult.score_after
            : (this.overview?.smartscore ?? 0));
    }

    get currentScore(): number {
        return this.answerResult
            ? this.answerResult.score_after
            : (this.overview?.smartscore ?? 0);
    }

    get scoreChangeLabel(): string {
        if (!this.answerResult) return '';
        const d = this.answerResult.score_delta;
        return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1);
    }

    formatDate(ts: number): string {
        return CoreTimeUtils.userDate(ts * 1000, 'core.strftimedate');
    }

    levelColorForScore(score: number): string {
        if (score >= 95) return '#f5a623';
        if (score >= 80) return '#0d6efd';
        if (score >= 60) return '#ffc107';
        if (score >= 40) return '#fd7e14';

        return '#dc3545';
    }
}
