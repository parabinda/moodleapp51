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
import {
    Component,
    Input,
    OnInit,
} from '@angular/core';
import {
    CoreCourseSection,
} from '@features/course/services/course-helper';
import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseViewedModulesDBRecord } from '@features/course/services/database/course';
import { sectionContentIsModule } from '@features/course/services/course';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
// //Arabinda - added - 2026-02-22: Import completion tracking for chapter progress bar
import { CoreCourseModuleCompletionStatus, CoreCourseModuleCompletionTracking } from '@features/course/constants';
import { CoreCourseModuleComponent } from '../module/module';

/**
 * Component to display course section.
 */
@Component({
    selector: 'core-course-section',
    templateUrl: 'course-section.html',
    styleUrl: 'course-section.scss',
    imports: [
        CoreSharedModule,
        CoreCourseModuleComponent,
    ],
    host: {
        '[class]': 'collapsible ? "collapsible" : "non-collapsible"',
    },
})
export class CoreCourseSectionComponent implements OnInit {

    @Input({ required: true }) course!: CoreCourseAnyCourseData; // The course to render.
    @Input({ required: true }) section!: CoreCourseSectionToDisplay;
    @Input({ transform: toBoolean }) collapsible = true; // Whether the section can be collapsed.
    @Input() lastModuleViewed?: CoreCourseViewedModulesDBRecord;
    @Input() viewedModules: Record<number, boolean> = {};

    completionStatusIncomplete = CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE;
    highlightedName?: string; // Name to highlight.
    isModule = sectionContentIsModule;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.highlightedName = this.section.highlighted && this.highlightedName === undefined
            ? CoreCourseFormatDelegate.getSectionHightlightedName(this.course)
            : undefined;
    }

    // //Arabinda - added - 2026-02-22: Chapter progress bar computation - Start
    /**
     * Returns completion progress for this section based on tracked modules.
     * Returns null if no trackable modules exist in this section.
     */
    getSectionProgress(): { percent: number; completed: number; total: number } | null {
        const modules = this.section.contents.filter(item => sectionContentIsModule(item));
        const trackable = modules.filter(
            m => m.completiondata && m.completiondata.tracking !== CoreCourseModuleCompletionTracking.NONE,
        );
        if (trackable.length === 0) {
            return null;
        }
        const completed = trackable.filter(
            m => m.completiondata!.state !== CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE,
        ).length;

        return {
            percent: Math.round((completed / trackable.length) * 100),
            completed,
            total: trackable.length,
        };
    }
    // //Arabinda - added - 2026-02-22: Chapter progress bar computation - End

}

export type CoreCourseSectionToDisplay = CoreCourseSection & {
    highlighted?: boolean;
    expanded?: boolean; // The aim of this property is to avoid DOM overloading.
};
