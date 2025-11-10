CREATE EXTENSION IF NOT EXISTS pgcrypto;


DROP TABLE if exists poi_connection;
DROP TABLE IF EXISTS notification;
DROP TABLE if exists follow;
DROP TABLE IF EXISTS review;
DROP TABLE IF EXISTS post_participation;
DROP TABLE IF EXISTS poi;
DROP TABLE IF EXISTS plan_day;
DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS workspace;
DROP TABLE IF EXISTS post;
DROP TABLE IF EXISTS profile;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS binary_content;

DROP TYPE IF EXISTS keyword_type;
DROP TYPE IF EXISTS gender;
DROP TYPE IF EXISTS post_status;
DROP TYPE IF EXISTS post_participation_status;
DROP TYPE IF EXISTS travel_tendency_type;
DROP TYPE IF EXISTS travel_style_type;
DROP TYPE IF EXISTS poi_status;
DROP TYPE if exists mbti_type;


CREATE TYPE keyword_type AS ENUM ('FOOD', 'ACCOMMODATION', 'ACTIVITY', 'TRANSPORT');
CREATE TYPE gender as ENUM ('남성', '여성');
CREATE TYPE post_status AS ENUM ('모집중','완료');
CREATE TYPE post_participation_status AS ENUM ('대기중', '승인', '거절');
CREATE TYPE travel_tendency_type AS ENUM ('내향적','외향적');
CREATE TYPE travel_style_type AS ENUM ('RELAXED', 'ACTIVE', 'CULTURAL', 'FOODIE', 'NATURE');
CREATE TYPE poi_status AS ENUM ('MARKED', 'SCHEDULED');
CREATE TYPE mbti_type AS ENUM ('ISFJ', 'ISFP', 'ISTJ', 'ISTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'ENFJ', 'ENFP', 'ENTJ', 'ENTP');

CREATE TABLE IF NOT EXISTS binary_content
(
    id         UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_name  TEXT        NOT NULL,
    file_type  TEXT        NOT NULL,
    file_size  BIGINT      NOT NULL
);

CREATE TABLE IF NOT EXISTS users
(
    id              UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    email           TEXT        NOT NULL,
    hashed_password TEXT        NOT NULL
);

CREATE TABLE IF NOT EXISTS profile
(
    id               UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL,
    profile_image_id UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ,
    nickname         TEXT        NOT NULL,
    gender           gender        NOT NULL,
    birth_date       DATE        NOT NULL,
    manner_temperature NUMERIC(4,1) NOT NULL DEFAULT 36.5,
    intro            TEXT        NOT NULL,
    description      TEXT        NOT NULL,
    travel_styles    travel_style_type[]      NOT NULL DEFAULT '{}'::travel_style_type[],
    tendency         travel_tendency_type[]      NOT NULL DEFAULT '{}'::tendency_type[],
    mbti             mbti_type        NOT null,
    is_pass_auth     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS post
(
    id        UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    writer_id UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- image_id  UUID ON DELETE SET NULL,
    title     TEXT        NOT NULL,
    content   TEXT        NOT NULL,
    status    post_status NOT NULL DEFAULT '모집중',
    location  TEXT        NOT NULL,
    max_participants INT NOT NULL DEFAULT 2,
    keywords  keyword_type[] DEFAULT '{}'::keyword_type[],
    start_date DATE NULL,
    end_date  DATE NULL
);

CREATE TABLE IF NOT EXISTS workspace
(
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id        UUID             NOT NULL,
    workspace_name TEXT             NOT NULL,
    -- base_longitude DOUBLE PRECISION NOT NULL,
    -- base_latitude  DOUBLE PRECISION NOT NULL,
    memo           TEXT             NULL,
    -- 위경도 범위 체크
    CHECK (base_longitude BETWEEN -180 AND 180),
    CHECK (base_latitude BETWEEN -90 AND 90)
);

CREATE TABLE IF NOT EXISTS chat_message
(
    id           UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    workspace_id UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ,
    content      TEXT        NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_day
(
    id           UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    day_no       INT         NOT NULL,
    plan_date    DATE,
    CHECK (day_no >= 1)
);

CREATE TABLE IF NOT EXISTS poi
(
    id          UUID PRIMARY KEY          DEFAULT gen_random_uuid(),
    plan_day_id UUID             NOT NULL,
    created_by  UUID             NOT NULL,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    place_name  TEXT             NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    address     TEXT             NOT NULL,
    status      poi_status       NOT NULL DEFAULT 'MARKED',
    schedule_seq    INT              NOT NULL DEFAULT 0,
    CHECK (longitude BETWEEN -180 AND 180),
    CHECK (latitude BETWEEN -90 AND 90)
);

-- CREATE TABLE IF NOT EXISTS poi_connection
-- (
--     id          UUID PRIMARY KEY     DEFAULT gen_random_uuid(),
--     prev_poi_id UUID,
--     next_poi_id UUID,
--     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     plan_day_id UUID        NOT NULL,
--     distance    INT         NOT NULL DEFAULT 0,
--     duration    INT         NOT NULL DEFAULT 0,
--     CHECK (distance >= 0 AND duration >= 0),
--     CHECK (prev_poi_id IS NOT NULL OR next_poi_id IS NOT NULL) -- prev/next 둘 다 NULL 금지(최소 한쪽 연결)
-- );

CREATE TABLE IF NOT EXISTS post_participation
(
    id           UUID PRIMARY KEY              DEFAULT gen_random_uuid(),
    requester_id UUID                 NOT NULL,
    post_id      UUID                 NOT NULL,
    requested_at TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    status       post_participation_status NOT NULL DEFAULT '대기중'
);

CREATE TABLE IF NOT EXISTS review
(
    id          UUID PRIMARY KEY       DEFAULT gen_random_uuid(),
    post_id     UUID,
    reviewer_id UUID          NOT NULL,
    reviewee_id UUID          NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    rating      NUMERIC(2, 1) NOT NULL,
    content     TEXT          NOT NULL,
    CHECK (rating >= 0 AND rating <= 5)
);

CREATE  TABLE IF NOT EXISTS notification
(
    id UUID PRIMARY KEY  DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content TEXT NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS follow
(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========= 2) ALTER TABLE: UNIQUE  =========
ALTER TABLE users
    ADD CONSTRAINT uq_users_email UNIQUE (email);
ALTER TABLE profile
    ADD CONSTRAINT uq_profile_user UNIQUE (user_id);
ALTER TABLE workspace
    ADD CONSTRAINT uq_workspace_post UNIQUE (post_id);
ALTER TABLE post_participation
    ADD CONSTRAINT uq_pp_unique UNIQUE (requester_id, post_id);
ALTER TABLE follow
    ADD CONSTRAINT uq_follow_unique UNIQUE (follower_id, following_id);

-- 3) ALTER TABLE: FOREIGN KEY
ALTER TABLE profile
    ADD CONSTRAINT fk_profile_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_profile_image
        FOREIGN KEY (profile_image_id) REFERENCES binary_content (id) ON DELETE SET NULL;

ALTER TABLE post
    ADD CONSTRAINT fk_post_writer
        FOREIGN KEY (writer_id) REFERENCES users (id) ON DELETE RESTRICT;
    -- ADD CONSTRAINT fk_post_image 나중에 추가하기 
    --     FOREIGN KEY (image_id) REFERENCES binary_content (id) ON DELETE SET NULL;        

ALTER TABLE workspace
    ADD CONSTRAINT fk_workspace_post
        FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE;

ALTER TABLE chat_message
    ADD CONSTRAINT fk_chatmsg_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_chatmsg_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE;

ALTER TABLE plan_day
    ADD CONSTRAINT fk_planday_workspace
        FOREIGN KEY (workspace_id) REFERENCES workspace (id) ON DELETE CASCADE;

ALTER TABLE poi
    ADD CONSTRAINT fk_poi_planday
        FOREIGN KEY (plan_day_id) REFERENCES plan_day (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_poi_creator
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE restrict,
    ADD CONSTRAINT uq_poi_schedule UNIQUE (plan_day_id, schedule_seq);


-- ALTER TABLE poi_connection
--     ADD CONSTRAINT fk_conn_prev FOREIGN KEY (prev_poi_id) REFERENCES poi (id) ON DELETE CASCADE,
--     ADD CONSTRAINT fk_conn_next FOREIGN KEY (next_poi_id) REFERENCES poi (id) ON DELETE CASCADE,
--     ADD CONSTRAINT fk_conn_planday FOREIGN KEY (plan_day_id) REFERENCES plan_day (id) ON DELETE CASCADE;
--     -- ADD CONSTRAINT fk_conn_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE post_participation
    ADD CONSTRAINT fk_pp_user FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_pp_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE;

ALTER TABLE review
    ADD CONSTRAINT fk_review_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_review_reviewee FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE Notification
    ADD CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;


ALTER TABLE follow
    ADD CONSTRAINT fk_follow_follower
        FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_follow_following
        FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT chk_not_self CHECK ( follower_id <> following_id );


CREATE UNIQUE INDEX idx_unique_schedule
    on poi (plan_day_id, schedule_seq)
    where schedule_seq > 0;
-- ========= 인덱스 =========
-- CREATE INDEX idx_post_writer               ON post(writer_id);
-- CREATE INDEX idx_workspace_post_id         ON workspace(post_id);
-- CREATE INDEX idx_chat_message_workspace_ts ON chat_message(workspace_id, created_at);
-- CREATE INDEX idx_chat_message_user         ON chat_message(user_id);
-- CREATE INDEX idx_planday_workspace_day     ON plan_day(workspace_id, day_no);
-- CREATE INDEX idx_poi_planday               ON poi(plan_day_id);
-- CREATE INDEX idx_poi_creator               ON poi(created_by);
-- CREATE INDEX idx_poi_geo                   ON poi(longitude, latitude);
-- CREATE INDEX idx_conn_planday              ON poi_connection(plan_day_id);
-- CREATE INDEX idx_conn_prev                 ON poi_connection(prev_poi_id);
-- CREATE INDEX idx_conn_next                 ON poi_connection(next_poi_id);
-- CREATE INDEX idx_pp_post                   ON post_participation(post_id);
-- CREATE INDEX idx_pp_user                   ON post_participation(requester_id);
