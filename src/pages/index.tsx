import { motion } from 'framer-motion';
import { GetStaticProps } from 'next';
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { Else, If, Then } from 'react-if';
import LazyLoad from 'react-lazy-load';
import useSWR from 'swr';
import { useLocalStorage } from 'usehooks-ts';
import ToggleButton from '~/components/buttons/ToggleButton';
import RandomComics from '~/components/features/RandomComics';
import MangaBanner from '~/components/shared/Banner';
import ClientOnly from '~/components/shared/ClientOnly';
import ColumnSection from '~/components/shared/ColumnSection';
import Head from '~/components/shared/Head';
import RecentlyComments from '~/components/shared/RecentlyComments';
import Section from '~/components/shared/Section';
import { MANGA_BROWSE_PAGE, REVALIDATE_TIME } from '~/constants';
import { connectToDatabase } from '~/serverless/utils/connectdbData';
import { axiosClientV2 } from '~/services/axiosClient';
import { Comic } from '~/types';
import { calculateSeason } from '~/utils/dateHandler';
import shuffle from '~/utils/randomArray';

import type { NextPage } from 'next';

const RecommendedComics = dynamic(
    () =>
        import('~/components/features/RecommendedComics', {
            ssr: false,
        } as ImportCallOptions),
);

const SectionSwiper = dynamic(
    () =>
        import('~/components/shared/SectionSwiper', {
            ssr: false,
        } as ImportCallOptions),
);

const SeasonalComics = dynamic(
    () =>
        import('~/components/shared/SeasonalComics', {
            ssr: false,
        } as ImportCallOptions),
);

interface HomeProps {
    topAllManga: Comic[];
    topMonthManga: Comic[];
    topWeekManga: Comic[];
    topDayManga: Comic[];
    seasonalComics: Comic[];
}

const Home: NextPage<HomeProps> = ({
    topAllManga,
    topMonthManga,
    topWeekManga,
    topDayManga,
    seasonalComics,
}) => {
    const [showRecommendedComics, setShowRecommendedComics] = useLocalStorage(
        'showVoting',
        false,
    );

    const handleToggleShowRecommendedComics = (state: boolean) => {
        setShowRecommendedComics(state);
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const { data: comicsNewUpdated } = useSWR<{
        comics: Comic[];
        totalPages: number;
    }>(
        `?top=0`,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        async (query) => {
            const res = await (
                await axiosClientV2.get(`/comics/filters${query}`)
            ).data;

            const { result } = res;

            if (result && result.mangaData.length === 0) {
                throw new Error();
            }

            if (result) {
                return {
                    comics: result.mangaData,
                    totalPages: result.totalPages,
                };
            }
        },
        {
            onErrorRetry: (error, _, __, revalidate, { retryCount }) => {
                // Never retry on 404.
                if (error.status === 404) return;

                // Only retry up to 1 time.
                if (retryCount >= 1) return;

                // Retry after 2 seconds.
                setTimeout(() => revalidate({ retryCount }), 2000);
            },
        },
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const { data: comicsNewRelease } = useSWR<{
        comics: Comic[];
        totalPages: number;
    }>(
        `?top=15`,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        async (query) => {
            const res = await (
                await axiosClientV2.get(`/comics/filters${query}`)
            ).data;

            const { result } = res;

            if (result && result.mangaData.length === 0) {
                throw new Error();
            }

            if (result) {
                return {
                    comics: result.mangaData,
                    totalPages: result.totalPages,
                };
            }
        },
        {
            onErrorRetry: (error, _, __, revalidate, { retryCount }) => {
                // Never retry on 404.
                if (error.status === 404) return;

                // Only retry up to 1 time.
                if (retryCount >= 1) return;

                // Retry after 2 seconds.
                setTimeout(() => revalidate({ retryCount }), 2000);
            },
        },
    );

    const { data: recommendedComics } = useSWR<
        { _id: Comic; votes: string[]; size: number }[]
    >(`/comics/recommended?limit=30`, async (slug) => {
        const { data } = await axiosClientV2.get(slug);

        return data?.comics || [];
    });

    return (
        <>
            <Head />

            <Toaster position="top-center" />

            <div className="flex h-fit min-h-screen flex-col">
                <ClientOnly>
                    <MangaBanner
                        mangaList={shuffle<Comic>([...topAllManga].slice(0, 5))}
                    />
                </ClientOnly>

                <Section
                    link={`/${MANGA_BROWSE_PAGE}?view=newComic`}
                    title="Mới cập nhật"
                    style="w-[90%] mx-auto w-max-[1300px] mt-6 overflow-x-hidden"
                    linkHints
                >
                    <SectionSwiper mangaList={comicsNewUpdated?.comics} />
                </Section>

                <LazyLoad offset={1000}>
                    <Section
                        title={
                            showRecommendedComics ? 'Cộng Đồng Bình Chọn' : ''
                        }
                        arrowTrendingUp
                        style="h-fit w-[90%] mx-auto w-max-[1300px] mt-6 overflow-x-hidden text-white"
                    >
                        <If condition={!showRecommendedComics}>
                            <Then>
                                {() => (
                                    <div className="absolute-center h-28 w-full ">
                                        <motion.div
                                            initial={{ scale: 0.8 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0.8 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 55,
                                            }}
                                            className="absolute-center h-4/5 w-[65%] rounded-lg border-2 border-white/40 px-4 md:w-96"
                                        >
                                            <h4 className="whitespace-nowrap">
                                                Hiển thị bình chọn
                                            </h4>
                                            <ToggleButton
                                                handleToggle={
                                                    handleToggleShowRecommendedComics
                                                }
                                            />
                                        </motion.div>
                                    </div>
                                )}
                            </Then>
                            <Else>
                                <RecommendedComics
                                    comics={recommendedComics}
                                    handleShowSection={
                                        handleToggleShowRecommendedComics
                                    }
                                />
                            </Else>
                        </If>
                    </Section>
                </LazyLoad>

                <LazyLoad>
                    <Section
                        title={`Comics Mùa ${calculateSeason()}`}
                        style="w-[90%] mx-auto w-max-[1300px] mt-6 overflow-x-hidden"
                    >
                        <SeasonalComics comics={seasonalComics} />
                    </Section>
                </LazyLoad>

                <LazyLoad>
                    <Section style="w-[90%] mx-auto w-max-[1300px] mt-6 overflow-x-hidden">
                        <RandomComics />
                    </Section>
                </LazyLoad>

                <LazyLoad>
                    <Section
                        title="Bình luận gần đây"
                        style="w-[90%] mx-auto w-max-[1300px] mt-6 overflow-x-hidden"
                    >
                        <RecentlyComments />
                    </Section>
                </LazyLoad>

                <LazyLoad>
                    <Section style="w-[90%] mx-auto min-w-[333px] w-max-[1300px] mt-6 overflow-x-hidden">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <ColumnSection
                                mangaList={[...topAllManga].slice(0, 5)}
                                title="Manga nổi bật nhất"
                                link={`/${MANGA_BROWSE_PAGE}?comics=manga-112&view=all`}
                            />
                            <ColumnSection
                                mangaList={[...topMonthManga].slice(0, 5)}
                                title="Manga nổi bật tháng"
                                link={`/${MANGA_BROWSE_PAGE}?comics=manga-112&view=month`}
                            />
                            <ColumnSection
                                mangaList={[...topWeekManga].slice(0, 5)}
                                title="Manga nổi bật tuần"
                                link={`/${MANGA_BROWSE_PAGE}?comics=manga-112&view=week`}
                            />
                            <ColumnSection
                                mangaList={[...topDayManga].slice(0, 5)}
                                title="Manga nổi bật ngày"
                                link={`/${MANGA_BROWSE_PAGE}?comics=manga-112&view=day`}
                            />
                        </div>
                    </Section>
                </LazyLoad>

                <LazyLoad>
                    <Section
                        link={`/${MANGA_BROWSE_PAGE}?view=new`}
                        title="Truyện mới"
                        style="w-[90%] mx-auto w-max-[1300px] mt-6  overflow-x-hidden"
                        linkHints
                    >
                        <SectionSwiper mangaList={comicsNewRelease?.comics} />
                    </Section>
                </LazyLoad>
            </div>
        </>
    );
};

export const getStaticProps: GetStaticProps = async () => {
    const { db } = await connectToDatabase();

    const [resultAll, resultMonth, resultWeek, resultDay, resultSeason] =
        await Promise.all([
            { comics: [] },
            { comics: [] },
            { comics: [] },
            { comics: [] },
            { comics: [] },
        ]);

    const { comics: topAllManga } = resultAll;
    const { comics: topMonthManga } = resultMonth;
    const { comics: topWeekManga } = resultWeek;
    const { comics: topDayManga } = resultDay;
    const { comics: seasonalComics } = resultSeason;

    return {
        props: {
            topAllManga: JSON.parse(JSON.stringify(topAllManga)),
            topMonthManga: JSON.parse(JSON.stringify(topMonthManga)),
            topWeekManga: JSON.parse(JSON.stringify(topWeekManga)),
            topDayManga: JSON.parse(JSON.stringify(topDayManga)),
            seasonalComics: JSON.parse(JSON.stringify(seasonalComics)),
        },
        revalidate: REVALIDATE_TIME,
    };
};

export default Home;
